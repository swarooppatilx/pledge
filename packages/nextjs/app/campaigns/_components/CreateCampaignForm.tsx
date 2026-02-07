"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EtherInput } from "@scaffold-ui/components";
import { parseEther } from "viem";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { type CreateCampaignInput, createCampaignSchema } from "~~/utils/campaign";

type CreateCampaignFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export const CreateCampaignForm = ({ onSuccess, onCancel }: CreateCampaignFormProps) => {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateCampaignInput>({
    title: "",
    description: "",
    fundingGoal: "",
    durationDays: 30,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "CampaignFactory",
  });

  const validateForm = (): boolean => {
    const result = createCampaignSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await writeContractAsync({
        functionName: "createCampaign",
        args: [parseEther(formData.fundingGoal), BigInt(formData.durationDays), formData.title, formData.description],
      });

      onSuccess?.();
      router.push("/campaigns");
    } catch (error) {
      console.error("Failed to create campaign:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Campaign Title *</span>
        </label>
        <input
          type="text"
          placeholder="Enter campaign title"
          className={`input input-bordered w-full ${errors.title ? "input-error" : ""}`}
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          maxLength={100}
        />
        {errors.title && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.title}</span>
          </label>
        )}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Description *</span>
        </label>
        <textarea
          placeholder="Describe your campaign..."
          className={`textarea textarea-bordered h-32 ${errors.description ? "textarea-error" : ""}`}
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          maxLength={2000}
        />
        <label className="label">
          <span className="label-text-alt">{formData.description.length}/2000</span>
          {errors.description && <span className="label-text-alt text-error">{errors.description}</span>}
        </label>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Funding Goal (ETH) *</span>
        </label>
        <EtherInput
          defaultValue={formData.fundingGoal}
          onValueChange={({ valueInEth }) => setFormData({ ...formData, fundingGoal: valueInEth })}
          placeholder="0.0"
        />
        {errors.fundingGoal && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.fundingGoal}</span>
          </label>
        )}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Campaign Duration (days) *</span>
        </label>
        <input
          type="number"
          placeholder="30"
          className={`input input-bordered w-full ${errors.durationDays ? "input-error" : ""}`}
          value={formData.durationDays}
          onChange={e => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 0 })}
          min={1}
          max={365}
        />
        <label className="label">
          <span className="label-text-alt">Between 1 and 365 days</span>
          {errors.durationDays && <span className="label-text-alt text-error">{errors.durationDays}</span>}
        </label>
      </div>

      <div className="divider"></div>

      <div className="flex justify-end gap-4">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </button>
        )}
        <button type="submit" className={`btn btn-primary ${isPending ? "loading" : ""}`} disabled={isPending}>
          {isPending ? "Creating..." : "Create Campaign"}
        </button>
      </div>
    </form>
  );
};
